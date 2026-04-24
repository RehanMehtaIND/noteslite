
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found to create note for.');
    return;
  }
  
  try {
    const note = await prisma.quickNote.create({
      data: {
        userId: user.id,
        title: 'Test Note',
        description: 'This is a test note created by script',
        color: '#5A7A9A',
        pinned: false
      }
    });
    console.log('Successfully created note:', note);
  } catch (err) {
    console.error('Failed to create note:', err);
  }
}

main().then(() => prisma.$disconnect());
