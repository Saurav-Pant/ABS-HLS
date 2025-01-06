import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function POST(request: Request) {
  try {
    const { id, email, name, image } = await request.json()

    const user = await prisma.user.upsert({
      where: { email: email },
      update: {
        name: name,
        image: image,
      },
      create: {
        id: id,
        email: email,
        name: name,
        image: image,
      },
    })

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Error storing user' }, { status: 500 })
  }
}
