import { Navigate, Route, Routes, type Location } from 'react-router-dom'
import type { Person } from './data'
import { InstallPrompt } from './native'
import { StackNavigator } from './stack'
import { useStore } from './store'
import { TabBar } from './ui'
import Login from './screens/Login'
import Home from './screens/Home'
import Scan from './screens/Scan'
import History from './screens/History'
import { LeaveRequest, MyLeaves, TeamCalendar } from './screens/Leaves'
import { MyTrips, TripForm } from './screens/Trips'
import Announcements from './screens/Announcements'
import Profile from './screens/Profile'
import { ManagerHome, TeamRecap } from './screens/Manager'
import { AdminPresences, AdminRequests, LeaveReview, TripReview } from './screens/Admin'
import Cash from './screens/Cash'
import { AdminAnnouncements, NewAnnouncement } from './screens/AdminAnnouncements'
import Exports from './screens/Exports'

function AppRoutes({ me, location }: { me: Person; location: Location }) {
  if (me.role === 'admin') return (
    <Routes location={location}>
      <Route path="/admin/presences" element={<AdminPresences />} />
      <Route path="/admin/demandes" element={<AdminRequests />} />
      <Route path="/admin/demandes/deplacements" element={<AdminRequests tab="trips" />} />
      <Route path="/admin/conges/:id" element={<LeaveReview />} />
      <Route path="/admin/deplacements/:id" element={<TripReview />} />
      <Route path="/admin/caisse" element={<Cash />} />
      <Route path="/admin/annonces" element={<AdminAnnouncements />} />
      <Route path="/admin/annonces/nouvelle" element={<NewAnnouncement />} />
      <Route path="/admin/exports" element={<Exports />} />
      <Route path="*" element={<Navigate to="/admin/presences" replace />} />
    </Routes>
  )
  return (
    <Routes location={location}>
      <Route path="/" element={me.role === 'manager' ? <ManagerHome /> : <Home />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/historique" element={<History />} />
      <Route path="/equipe" element={me.role === 'manager' ? <TeamRecap /> : <Navigate to="/" replace />} />
      <Route path="/conges" element={<MyLeaves />} />
      <Route path="/conges/calendrier" element={<TeamCalendar />} />
      <Route path="/conges/nouveau" element={<LeaveRequest />} />
      <Route path="/deplacements" element={<MyTrips />} />
      <Route path="/deplacements/nouveau" element={<TripForm />} />
      <Route path="/annonces" element={<Announcements />} />
      <Route path="/profil" element={<Profile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const { me } = useStore()
  return (
    <>
      {me
        ? <StackNavigator key={me.id}
            render={loc => <AppRoutes me={me} location={loc} />}
            tabBar={pathname => <TabBar role={me.role} pathname={pathname} />} />
        : <Routes><Route path="*" element={<div className="stack"><div className="stack-page"><Login /></div></div>} /></Routes>}
      <InstallPrompt />
    </>
  )
}
