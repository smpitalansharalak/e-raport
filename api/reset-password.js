export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers.authorization?.split(' ')[1]
  const { userId } = req.body || {}
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!SUPABASE_URL || !SERVICE_ROLE || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server env belum dikonfigurasi dengan benar.' })
  }

  if (!token) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' })
  }

  if (!userId) {
    return res.status(400).json({ error: 'Parameter userId diperlukan.' })
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa.' })
    }

    const currentUser = await userRes.json()
    if (!currentUser?.id) {
      return res.status(401).json({ error: 'Gagal memverifikasi sesi user.' })
    }

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${currentUser.id}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!profileRes.ok) {
      return res.status(403).json({ error: 'Gagal memeriksa peran user.' })
    }

    const profileData = await profileRes.json()
    const profile = Array.isArray(profileData) ? profileData[0] : null
    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang dapat mereset password pengguna.' })
    }

    const resetRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: '12345678' }),
    })

    if (!resetRes.ok) {
      const body = await resetRes.json().catch(() => null)
      return res.status(500).json({ error: body?.error_description || body?.error || 'Gagal mereset password.' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[reset-password] error', err)
    return res.status(500).json({ error: 'Terjadi kesalahan server saat mereset password.' })
  }
}
