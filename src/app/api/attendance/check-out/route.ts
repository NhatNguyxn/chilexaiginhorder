import { handleAttendanceSubmission } from '../record/route';

export async function POST(request: Request) {
  return handleAttendanceSubmission(request, 'check_out');
}
