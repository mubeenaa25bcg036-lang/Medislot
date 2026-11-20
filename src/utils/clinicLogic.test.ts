import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionAppointmentStatus,
  computeDashboardMetrics,
  computeProfileCompleteness,
  filterDoctors,
  getAvailableSlotsForDate,
  getEarliestAvailableSlot,
  getUpcomingDates,
  validateBookingInput,
  validateProfileInput,
} from './clinicLogic';
import { SEED_DOCTORS, SEED_PROFILES, buildSeedAppointments } from '../data/seedClinicData';

test('getUpcomingDates generates sequential UTC dates', () => {
  const dates = getUpcomingDates('2026-11-18', 4);
  assert.deepEqual(dates, ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
});

test('filterDoctors filters by specialty, visit mode, and query', () => {
  const neuro = filterDoctors(SEED_DOCTORS, {
    specialty: 'Neurology',
    query: '',
    visitMode: 'All',
  });
  assert.equal(neuro.length, 1);
  assert.equal(neuro[0].id, 'doc-tanaka');

  const queryMatch = filterDoctors(SEED_DOCTORS, {
    specialty: 'All',
    query: 'migraine',
    visitMode: 'Video Visit',
  });
  assert.equal(queryMatch.length, 1);
  assert.equal(queryMatch[0].id, 'doc-tanaka');
});

test('getAvailableSlotsForDate excludes booked non-cancelled appointments', () => {
  const doctor = SEED_DOCTORS[0];
  const appointments = buildSeedAppointments('2026-11-18');
  const availableTomorrow = getAvailableSlotsForDate(doctor, '2026-11-19', appointments);
  assert.equal(availableTomorrow.includes('09:45 AM'), false);
  assert.equal(availableTomorrow[0], '09:00 AM');
  assert.equal(getEarliestAvailableSlot(doctor, '2026-11-19', appointments), '09:00 AM');
});

test('validateBookingInput rejects missing reason or slot and accepts valid payloads', () => {
  const invalid = validateBookingInput({
    doctorId: 'doc-jenkins',
    date: '2026-11-19',
    timeSlot: '',
    visitMode: 'Video Visit',
    reason: 'hi',
    patientName: 'Maya Lin',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.timeSlot);
  assert.ok(invalid.errors.reason);

  const valid = validateBookingInput({
    doctorId: 'doc-jenkins',
    date: '2026-11-19',
    timeSlot: '11:00 AM',
    visitMode: 'Video Visit',
    reason: 'Blood pressure medication review',
    patientName: 'Maya Lin',
  });
  assert.equal(valid.valid, true);
});

test('validateProfileInput and computeProfileCompleteness work accurately', () => {
  const maya = SEED_PROFILES[0];
  assert.equal(validateProfileInput(maya).valid, true);
  assert.equal(computeProfileCompleteness(maya), 100);

  const incomplete = {
    ...maya,
    allergies: '',
    medications: '',
    insuranceMemberId: '',
  };
  assert.equal(computeProfileCompleteness(incomplete), 70);

  const badEmail = validateProfileInput({ ...maya, email: 'not-an-email' });
  assert.equal(badEmail.valid, false);
  assert.ok(badEmail.errors.email);
});

test('canTransitionAppointmentStatus enforces valid appointment lifecycle', () => {
  assert.equal(canTransitionAppointmentStatus('upcoming', 'checked-in'), true);
  assert.equal(canTransitionAppointmentStatus('upcoming', 'cancelled'), true);
  assert.equal(canTransitionAppointmentStatus('checked-in', 'completed'), true);
  assert.equal(canTransitionAppointmentStatus('completed', 'cancelled'), false);
  assert.equal(canTransitionAppointmentStatus('cancelled', 'upcoming'), false);
});

test('computeDashboardMetrics aggregates upcoming, completed, and next visit', () => {
  const appointments = buildSeedAppointments('2026-11-18');
  const metrics = computeDashboardMetrics(appointments, 'pat-maya');
  assert.equal(metrics.upcomingCount, 2);
  assert.equal(metrics.completedCount, 1);
  assert.equal(metrics.cancelledCount, 0);
  assert.equal(metrics.nextAppointment?.id, 'apt-1001');
});
