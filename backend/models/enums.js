// Centralized enum/constant definitions shared across models and routes.

const UserRole = Object.freeze({ CUSTOMER: 'customer', PROFESSIONAL: 'professional', ADMIN: 'admin' });

const ProfileStatus = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });

const QueueState = Object.freeze({ OPEN: 'open', PAUSED: 'paused' });

const TokenState = Object.freeze({ BOOKED: 'booked', SERVING: 'serving', SKIPPED: 'skipped', COMPLETED: 'completed' });

const AppointmentStatus = Object.freeze({
  BOOKED: 'booked',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
  NO_SHOW: 'no_show'
});

const PaymentType = Object.freeze({ UPI: 'upi' });
const PaymentStatus = Object.freeze({ PENDING: 'pending', PAID: 'paid', FAILED: 'failed', REFUNDED: 'refunded' });
const PaymentEntityType = Object.freeze({ APPOINTMENT: 'appointment', TOKEN: 'token' });

const BlockedDateReason = Object.freeze({ HOLIDAY: 'holiday', MANUAL_BLOCK: 'manual_block' });

const ReviewStatus = Object.freeze({ PUBLISHED: 'published', HIDDEN: 'hidden', FLAGGED: 'flagged' });

const NotificationType = Object.freeze({
  BOOKING_CONFIRMATION: 'booking_confirmation',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  QUEUE_UPDATE: 'queue_update',
  DELAY: 'delay',
  CANCELLATION: 'cancellation',
  RESCHEDULE: 'reschedule',
  REVIEW_REQUEST: 'review_request'
});

const NotificationChannel = Object.freeze({ IN_APP: 'in_app', WHATSAPP: 'whatsapp', SMS: 'sms', EMAIL: 'email' });
const NotificationStatus = Object.freeze({ PENDING: 'pending', SENT: 'sent', FAILED: 'failed' });

module.exports = {
  UserRole, ProfileStatus, QueueState, TokenState, AppointmentStatus,
  PaymentType, PaymentStatus, PaymentEntityType, BlockedDateReason,
  ReviewStatus, NotificationType, NotificationChannel, NotificationStatus
};
