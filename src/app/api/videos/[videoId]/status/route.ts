import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../../lib/prisma'

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { videoId: string } }
// ) {
//   try {
//     const video = await prisma.video.findUnique({
//       where: {
//         id: params.videoId,
//       },
//       select: {
//         id: true,
//         title: true,
//         description: true,
//         status: true,
//         processingProgress: true,
//         manifestUrl: true,
//         availableQualities: true,
//         errorMessage: true,
//       },
//     });

//     if (!video) {
//       return NextResponse.json({ error: 'Video not found' }, { status: 404 });
//     }

//     return NextResponse.json(video);
//   } catch (error) {
//     console.error('Error fetching video status:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }


export function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
