const fastify = require('fastify')({ logger: true })
const validator = require('email-validator')
const dns = require('dns')
const redis = require('redis')

const client = redis.createClient({ url: process.env.FLY_REDIS_CACHE_URL || 'redis://localhost:6379' })
const port = process.env.PORT || 7000

fastify.get('/', (_, reply) => {
  reply.code(200).header('Content-Type', 'application/json; charset=utf-8').send({})
})

fastify.post('/validate', async (request, reply) => {
  try {
    const email = request.body.email || ''
    const domain = email.split('@')[1]

    if (!validator.validate(email)) {
      reply
        .code(406)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send({ valid: false, error: 'Invalid email' })
    } else {
      client.get(`domain:${domain}`, async (err, rep) => {
        if (rep) {
          if (rep === 'VALID') {
            reply.code(200).header('Content-Type', 'application/json; charset=utf-8').send({ valid: true, error: null })
          } else {
            reply
              .code(406)
              .header('Content-Type', 'application/json; charset=utf-8')
              .send({ valid: false, error: 'Invalid email domain name' })
          }
        } else {
          dns.resolve(domain, 'MX', async (err, addresses) => {
            if (err) {
              client.set(`domain:${domain}`, 'INVALID')

              reply
                .code(406)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send({ valid: false, error: 'Invalid email domain name' })
            } else if (addresses && addresses.length > 0) {
              client.set(`domain:${domain}`, 'VALID')

              reply
                .code(200)
                .header('Content-Type', 'application/json; charset=utf-8')
                .send({ valid: true, error: null })
            }
          })
        }
      })
    }
  } catch (error) {
    reply
      .code(406)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ valid: false, error: 'Unknown error' })
  }
})

const start = async () => {
  try {
    await fastify.listen(port, '0.0.0.0')
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
