import { useGameStore } from './store/gameStore'
import MainMenu from './components/MainMenu'
import GameCanvas from './components/GameCanvas'
import HUD from './components/HUD'
import HUDEditor from './components/HUDEditor'
import ResultScreen from './components/ResultScreen'
import ReplayControls from './components/ReplayControls'
import CarCustomizer from './components/CarCustomizer'
import TrackEditor from './components/TrackEditor'
import Shop from './components/Shop'

export default function App() {
  const phase = useGameStore(s => s.phase)

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a1a] relative">
      {phase === 'menu' && <MainMenu />}
      {phase === 'customize' && <CarCustomizer />}
      {phase === 'editor' && <TrackEditor />}
      {phase === 'shop' && <Shop />}
      {(phase === 'countdown' || phase === 'racing') && (
        <>
          <GameCanvas />
          <HUD />
          <HUDEditor />
        </>
      )}
      {phase === 'finished' && (
        <>
          <GameCanvas />
          <ResultScreen />
        </>
      )}
      {phase === 'replay' && (
        <>
          <GameCanvas />
          <ReplayControls />
        </>
      )}
    </div>
  )
}
