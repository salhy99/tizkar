import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/editor/',
        '/edit/',
        '/recover',
        '/admin/',
        '/dashboard/',
        '/login'
      ],
    }
  }
}
