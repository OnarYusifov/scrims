import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient();

export type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];




