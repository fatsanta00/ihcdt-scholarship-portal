'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateApplicationStatus(id: string, status: string) {
  await db.application.update({
    where: { id },
    data: { status }
  });
  
  revalidatePath(`/admin/applications/${id}`);
  revalidatePath('/admin/dashboard');
}
