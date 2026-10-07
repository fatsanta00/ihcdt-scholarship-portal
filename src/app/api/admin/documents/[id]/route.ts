import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDocumentBuffer } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await db.document.findUnique({ where: { id } });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const buffer = await getDocumentBuffer(document.storage_path);

    // Stream the file back
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': document.mime_type,
        'Content-Disposition': `attachment; filename="${document.original_filename}"`,
      },
    });
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
