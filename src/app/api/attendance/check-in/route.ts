import { handleAttendanceSubmission } from '@/lib/attendance-handler';

export async function POST(request: Request) {
  return handleAttendanceSubmission(request, 'check_in');
}
