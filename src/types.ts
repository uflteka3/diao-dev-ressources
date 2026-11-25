export type Resource = {
  id: string
  title: string
  slug: string
  short_description: string
  description: string
  category: string
  tags: string[]
  cover_url: string | null
  external_url: string | null
  file_url: string | null
  published: boolean
  views: number
  clicks: number
  downloads: number
  created_at: string
}
