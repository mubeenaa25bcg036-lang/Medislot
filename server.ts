import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import { ClinicStore } from './server/store.ts';
import type { RealtimeEvent, TriageRecommendation } from './src/types/clinic.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const store = new ClinicStore();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcast = (event: RealtimeEvent) => {
    const serialized = JSON.stringify(event);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  };

  wss.on('connection', (socket) => {
    const initEvent: RealtimeEvent = {
      type: 'sync:init',
      payload: store.getBootstrap(),
    };
    socket.send(JSON.stringify(initEvent));

    socket.on('error', (err) => {
      console.error('WebSocket client error:', err);
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      serverTime: new Date().toISOString(),
      connectedClients: wss.clients.size,
    });
  });

  app.get('/api/bootstrap', (_req, res) => {
    res.json(store.getBootstrap());
  });

  app.put('/api/profile', (req, res) => {
    const result = store.updateActiveProfile(req.body || {});
    if (!result.ok || !result.profile) {
      return res.status(400).json({
        error: result.error || 'Failed to update patient profile.',
        fieldErrors: result.fieldErrors || {},
      });
    }
    broadcast({ type: 'profile:updated', payload: result.profile });
    return res.json({ profile: result.profile });
  });

  app.post('/api/profile/switch', (req, res) => {
    const result = store.switchProfile(req.body || {});
    if (!result.ok || !result.activeProfile || !result.profiles) {
      return res.status(400).json({
        error: result.error || 'Failed to switch patient profile.',
        fieldErrors: result.fieldErrors || {},
      });
    }
    broadcast({
      type: 'profile:switched',
      payload: {
        activeProfile: result.activeProfile,
        profiles: result.profiles,
      },
    });
    return res.json({
      activeProfile: result.activeProfile,
      profiles: result.profiles,
    });
  });

  app.post('/api/appointments', (req, res) => {
    const result = store.createAppointment(req.body || {});
    if (!result.ok || !result.appointment) {
      return res.status(400).json({
        error: result.error || 'Unable to book appointment.',
        fieldErrors: result.fieldErrors || {},
      });
    }
    broadcast({ type: 'appointment:created', payload: result.appointment });
    return res.status(201).json({ appointment: result.appointment });
  });

  app.patch('/api/appointments/:id', (req, res) => {
    const result = store.updateAppointment(req.params.id, req.body || {});
    if (!result.ok || !result.appointment) {
      const status = result.error === 'Appointment not found.' ? 404 : 400;
      return res.status(status).json({
        error: result.error || 'Unable to update appointment.',
      });
    }
    broadcast({ type: 'appointment:updated', payload: result.appointment });
    return res.json({ appointment: result.appointment });
  });

  app.post('/api/triage', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (prompt.length < 4) {
      return res.status(400).json({
        error: 'Please enter a brief description of your symptoms or scheduling preferences.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error:
          'AI Triage requires a configured GEMINI_API_KEY in Settings > Secrets. You can still browse all clinicians and book slots directly below.',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const doctors = store.getDoctors();
      const doctorRoster = doctors
        .map((d) => `${d.id}: ${d.name} (${d.specialty}, modes: ${d.visitModes.join('/')})`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Patient request: "${prompt}"\n\nAvailable clinicians:\n${doctorRoster}`,
        config: {
          systemInstruction:
            'You are a clinical intake triage coordinator for Clinical Clarity. Match the patient description to the single most appropriate specialty from Cardiology, Neurology, Primary Care, Dermatology, or Pediatrics, recommend a visit mode, give a concise non-diagnostic clinical prep summary, and list 3 practical pre-visit preparation steps.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedSpecialty: {
                type: Type.STRING,
                enum: [
                  'Cardiology',
                  'Neurology',
                  'Primary Care',
                  'Dermatology',
                  'Pediatrics',
                ],
              },
              urgency: {
                type: Type.STRING,
                enum: [
                  'Routine',
                  'Prompt (24-48h)',
                  'Urgent Care Recommended',
                ],
              },
              clinicalSummary: {
                type: Type.STRING,
                description:
                  'Concise 1-2 sentence clinical intake orientation without diagnosing.',
              },
              suggestedVisitMode: {
                type: Type.STRING,
                enum: ['In-Person', 'Video Visit'],
              },
              prepChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 short pre-visit preparation steps.',
              },
              recommendedDoctorId: {
                type: Type.STRING,
                description: 'ID of the matching clinician from the roster.',
              },
            },
            required: [
              'recommendedSpecialty',
              'urgency',
              'clinicalSummary',
              'suggestedVisitMode',
              'prepChecklist',
            ],
          },
        },
      });

      const text = (response.text ?? '').trim();
      if (!text) {
        return res.status(502).json({
          error: 'AI Triage returned an empty response. Please try again.',
        });
      }

      const parsed = JSON.parse(text) as TriageRecommendation;
      const matchedDoctor =
        doctors.find((d) => d.id === parsed.recommendedDoctorId) ||
        doctors.find((d) => d.specialty === parsed.recommendedSpecialty) ||
        doctors[0];

      return res.json({
        triage: {
          ...parsed,
          recommendedDoctorId: matchedDoctor.id,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to reach AI Triage service.';
      console.error('Gemini triage error:', err);
      return res.status(500).json({
        error: `AI Triage could not complete: ${message}`,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Clinical Clarity server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
