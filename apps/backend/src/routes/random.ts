import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomService } from '../services/random.service';

export default async function randomRoutes(fastify: FastifyInstance) {
  // Generate a random integer
  fastify.post('/random/int', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Body: {
      min: number;
      max: number;
    };
  }>, reply: FastifyReply) => {
    try {
      const { min, max } = request.body;

      if (typeof min !== 'number' || typeof max !== 'number') {
        return reply.code(400).send({ error: 'min and max must be numbers' });
      }

      if (min > max) {
        return reply.code(400).send({ error: 'min must be less than or equal to max' });
      }

      const value = await randomService.randomInt(min, max);
      return { value };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });

  // Shuffle an array
  fastify.post('/random/shuffle', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Body: {
      array: any[];
    };
  }>, reply: FastifyReply) => {
    try {
      const { array } = request.body;

      if (!Array.isArray(array)) {
        return reply.code(400).send({ error: 'array must be an array' });
      }

      const shuffled = await randomService.shuffleArray(array);
      return { shuffled };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });

  // Coin flip
  fastify.post('/random/coinflip', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await randomService.coinFlip();
      return { result };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });

  // Select random items from array
  fastify.post('/random/select', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Body: {
      array: any[];
      n: number;
    };
  }>, reply: FastifyReply) => {
    try {
      const { array, n } = request.body;

      if (!Array.isArray(array)) {
        return reply.code(400).send({ error: 'array must be an array' });
      }

      if (typeof n !== 'number' || n < 0) {
        return reply.code(400).send({ error: 'n must be a non-negative number' });
      }

      const selected = await randomService.selectRandom(array, n);
      return { selected };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });
}

