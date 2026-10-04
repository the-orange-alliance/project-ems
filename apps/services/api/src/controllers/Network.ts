import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { networkInterfaces } from 'os';
import { z } from 'zod';
import { errorableSchema, InternalServerError } from '../util/Errors.js';

const networkSchema = z.object({
  addresses: z.array(
    z.object({
      name: z.string(),
      address: z.string()
    })
  )
});

// 169.254.x.x is self-assigned (no DHCP) and never reachable from a tablet.
const LINK_LOCAL = /^169\.254\./;
// Hypervisor/VPN/container adapters - listed, but after real NICs.
const VIRTUAL_ADAPTER =
  /vEthernet|VirtualBox|VMware|Hyper-V|WSL|docker|Tailscale|ZeroTier|Loopback/i;

// Fastify plugin for the network route. Lists this machine's external IPv4
// addresses so the web app can build a LAN-reachable URL (e.g. the QR code
// that configures ref tablets) - a browser can't discover its host's LAN IP.
// Intentionally unauthenticated and DB-free, like the heartbeat.
async function networkController(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: errorableSchema<typeof networkSchema>(networkSchema),
        tags: ['Network']
      }
    },
    async (request, reply) => {
      try {
        const addresses = Object.entries(networkInterfaces())
          .flatMap(([name, infos]) =>
            (infos ?? [])
              .filter(
                (info) =>
                  info.family === 'IPv4' &&
                  !info.internal &&
                  !LINK_LOCAL.test(info.address)
              )
              .map((info) => ({ name, address: info.address }))
          )
          // Physical adapters first, so the UI's default pick is the LAN.
          .sort(
            (a, b) =>
              Number(VIRTUAL_ADAPTER.test(a.name)) -
              Number(VIRTUAL_ADAPTER.test(b.name))
          );
        reply.send({ addresses });
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default networkController;
