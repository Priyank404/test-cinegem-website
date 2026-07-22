import { Routes, Route } from 'react-router-dom'

import HomePage                from '@/pages/HomePage'
import StillImagesPage         from '@/pages/StillImagesPage'
import CreativeImagesPage      from '@/pages/CreativeImagesPage'
import OnBodyVisualizationPage from '@/pages/OnBodyVisualizationPage'
import CreativeAnimationPage   from '@/pages/CreativeAnimationPage'
import Animation360Page        from '@/pages/Animation360Page'
import InquirePage             from '@/pages/InquirePage'
import { CustomCursor }        from '@/components/ui/CustomCursor'
import ClassicEComVisuals from './pages/ClassicEComVisuals'
import CreativeVisualsPage     from '@/pages/CreativeVisualsPage'
 import HeroPage2 from '@/pages/HeroPage2'

export default function App() {
  return (
    <>
      <CustomCursor />
      <Routes>
        <Route path="/"               element={<HomePage />} />
        <Route path="/hero2" element={<HeroPage2 />} />
        <Route path="/still"          element={<StillImagesPage />} />
        <Route path="/creative"       element={<CreativeImagesPage />} />
        <Route path="/onbody"         element={<OnBodyVisualizationPage />} />
        <Route path="/creative-anim"  element={<CreativeAnimationPage />} />
        <Route path="/360"            element={<Animation360Page />} />
        <Route path="/inquire"        element={<InquirePage />} />
        <Route path="/classic"        element={<ClassicEComVisuals />} />
        <Route path="/creative-visuals" element={<CreativeVisualsPage />} />
      </Routes>
    </>
  )
}