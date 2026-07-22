import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import AddExpenseSheet from './components/AddExpenseSheet'
import AddTripSheet from './components/AddTripSheet'
import ItinSheet from './components/ItinSheet'
import PlaceSheet from './components/PlaceSheet'
import JournalSheet from './components/JournalSheet'
import FlightSheet from './components/FlightSheet'
import StaySheet from './components/StaySheet'
import PhotoSheet from './components/PhotoSheet'
import CompanionSheet from './components/CompanionSheet'
import ConfirmDialog from './components/ConfirmDialog'
import HomeScreen from './screens/HomeScreen'
import TripsScreen from './screens/TripsScreen'
import TripOverviewScreen from './screens/TripOverviewScreen'
import ItineraryScreen from './screens/ItineraryScreen'
import ExpensesScreen from './screens/ExpensesScreen'
import BudgetScreen from './screens/BudgetScreen'
import PrepScreen from './screens/PrepScreen'
import PlacesScreen from './screens/PlacesScreen'
import JournalScreen from './screens/JournalScreen'
import LogisticsScreen from './screens/LogisticsScreen'
import MapScreen from './screens/MapScreen'
import SummaryScreen from './screens/SummaryScreen'
import GalleryScreen from './screens/GalleryScreen'
import CompanionsScreen from './screens/CompanionsScreen'
import StubScreen from './screens/StubScreen'

export default function App() {
  return (
    <div className="stage">
      <div className="app">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/trips" element={<TripsScreen />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/itinerary" element={<ItineraryScreen />} />
          <Route path="/expenses" element={<ExpensesScreen />} />
          <Route path="/profile" element={<StubScreen kind="profile" />} />
          <Route path="/trip/:id" element={<TripOverviewScreen />} />
          <Route path="/trip/:id/itinerary" element={<ItineraryScreen />} />
          <Route path="/trip/:id/expenses" element={<ExpensesScreen />} />
          <Route path="/trip/:id/budget" element={<BudgetScreen />} />
          <Route path="/trip/:id/prep" element={<PrepScreen />} />
          <Route path="/trip/:id/places" element={<PlacesScreen />} />
          <Route path="/trip/:id/journal" element={<JournalScreen />} />
          <Route path="/trip/:id/logistics" element={<LogisticsScreen />} />
          <Route path="/trip/:id/summary" element={<SummaryScreen />} />
          <Route path="/trip/:id/gallery" element={<GalleryScreen />} />
          <Route path="/trip/:id/map" element={<MapScreen />} />
          <Route path="/trip/:id/companions" element={<CompanionsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
        <AddExpenseSheet />
        <AddTripSheet />
        <ItinSheet />
        <PlaceSheet />
        <JournalSheet />
        <FlightSheet />
        <StaySheet />
        <PhotoSheet />
        <CompanionSheet />
        {/* 放最後：確認彈窗必須疊在其他 sheet 之上 */}
        <ConfirmDialog />
      </div>
    </div>
  )
}
