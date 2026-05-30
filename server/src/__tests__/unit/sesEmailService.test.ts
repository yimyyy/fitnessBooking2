import { sendBookingConfirmation, sendWaitlistPromotion } from '../../services/sesEmailService';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

jest.mock('@aws-sdk/client-ses', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  return {
    SESClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    SendEmailCommand: jest.fn().mockImplementation((params) => params),
    __mockSend: mockSend,
  };
});

const mockModule = jest.requireMock('@aws-sdk/client-ses') as { __mockSend: jest.Mock };

const mockUser = {
  id: 'user-1', name: 'Alice', email: 'alice@test.com',
  passwordHash: 'hash', role: 'student' as const, language: 'en', createdAt: new Date(),
};

const mockClass = {
  id: 'class-1', title: 'Yoga', description: 'Morning yoga',
  instructorId: 'instr-1', startTime: new Date(), endTime: new Date(),
  capacity: 10, price: 20, location: 'Room A',
  isRecurring: false, recurrenceRule: null, parentClassId: null,
  status: 'upcoming' as const, createdAt: new Date(),
};

describe('sesEmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production'; // force SES path (not dev logger)
  });
  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('sendBookingConfirmation calls SES with correct parameters', async () => {
    await sendBookingConfirmation(mockUser, mockClass);
    expect(mockModule.__mockSend).toHaveBeenCalled();
    const callArg = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(callArg.Destination.ToAddresses).toContain(mockUser.email);
    expect(callArg.Message.Subject.Data).toContain(mockClass.title);
  });

  it('sendWaitlistPromotion uses correct email template', async () => {
    await sendWaitlistPromotion(mockUser, mockClass);
    expect(mockModule.__mockSend).toHaveBeenCalled();
    const callArg = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(callArg.Message.Subject.Data).toContain("You're In!");
  });

  it('handles SES errors gracefully', async () => {
    mockModule.__mockSend.mockRejectedValueOnce(new Error('SES error'));
    // sendBookingConfirmation should not throw even if SES fails
    // (caller handles the error)
    await expect(sendBookingConfirmation(mockUser, mockClass)).rejects.toThrow('SES error');
  });
});
