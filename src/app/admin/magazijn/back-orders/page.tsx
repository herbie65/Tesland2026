import { Metadata } from 'next'
import BackOrdersClient from './BackOrdersClient'

export const metadata: Metadata = {
  title: 'Back-Orders - Magazijn',
  description: 'Onderdelen die nog besteld moeten worden'
}

export default function BackOrdersPage() {
  return <BackOrdersClient />
}
