import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import { store } from '../app/store'
import { TmaApp } from './TmaApp'
import '../styles/tokens.css'
import '../styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <TmaApp />
      </BrowserRouter>
    </Provider>
  </StrictMode>
)
