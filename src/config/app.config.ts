import { ConfigService, registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'Nestjs Template',
  port: parseInt(process.env.APP_PORT ?? '3000', 10) || 3000,
  host: process.env.APP_HOST || 'localhost',
}))
