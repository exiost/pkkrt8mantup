import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import Layout, { usePeran } from './components/Layout'
import { ConfirmProvider } from './components/ui'
import { useUi } from './lib/ui'
import Dashboard from './pages/Dashboard'
import WargaPage from './pages/Warga'
import WargaDetail from './pages/WargaDetail'
import KeluargaPage from './pages/Keluarga'
import KeluargaDetail from './pages/KeluargaDetail'
import IbuAnak from './pages/IbuAnak'
import LaporanHub from './pages/LaporanHub'
import LaporanPage from './pages/Laporan'
import Pengaturan from './pages/Pengaturan'
import DataPage from './pages/Data'
import Sampah from './pages/Sampah'
import Riwayat from './pages/Riwayat'
import Pekarangan from './pages/Pekarangan'
import { EditorHost } from './components/EditorHost'

/** Rute per peran: viewer hanya laporan; Beranda khusus admin */
function Rute({ loc }: { loc: ReturnType<typeof useLocation> }) {
  const peran = usePeran()
  if (peran === 'viewer') {
    return (
      <Routes location={loc}>
        <Route path="/laporan" element={<LaporanHub />} />
        <Route path="/laporan/:slug" element={<LaporanPage />} />
        <Route path="*" element={<Navigate to="/laporan" replace />} />
      </Routes>
    )
  }
  return (
    <Routes location={loc}>
      <Route path="/" element={peran === 'admin' ? <Dashboard /> : <Navigate to="/warga" replace />} />
      <Route path="/warga" element={<WargaPage />} />
      <Route path="/warga/:id" element={<WargaDetail />} />
      <Route path="/keluarga" element={<KeluargaPage />} />
      <Route path="/keluarga/:id" element={<KeluargaDetail />} />
      <Route path="/ibu-anak" element={<IbuAnak />} />
      <Route path="/pekarangan" element={<Pekarangan />} />
      <Route path="/laporan" element={<LaporanHub />} />
      <Route path="/laporan/:slug" element={<LaporanPage />} />
      <Route path="/pengaturan" element={<Pengaturan />} />
      <Route path="/data" element={peran === 'admin' ? <DataPage /> : <Navigate to="/warga" replace />} />
      <Route path="/sampah" element={<Sampah />} />
      <Route path="/riwayat" element={<Riwayat />} />
      <Route path="*" element={<Navigate to={peran === 'admin' ? '/' : '/warga'} replace />} />
    </Routes>
  )
}

export default function App() {
  const loc = useLocation()
  const { dark, reduceMotion } = useUi()
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <ConfirmProvider>
        <EditorHost>
          <Layout>
            <AnimatePresence mode="wait">
              <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <Rute loc={loc} />
              </motion.div>
            </AnimatePresence>
          </Layout>
        </EditorHost>
      </ConfirmProvider>
      <Toaster richColors position="top-center" closeButton />
    </MotionConfig>
  )
}
