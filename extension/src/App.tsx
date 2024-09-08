import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { DOMMessage, DOMMessageResponse } from './types/chromeExtension'
import PokemonDisplay from './components/PokemonDisplay'

function App() {
  const [count, setCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pokemonData, setPokemonData] = useState<any>(null);

  const getSiteInfo = () => {

    if (chrome.runtime) {
      chrome.runtime.sendMessage({ type: "GET_DOM" } as DOMMessage,
        (response: DOMMessageResponse) => {
          console.log("response", response)
          console.log("response.url", response.url)
          setAvatarUrl(response.url);
          setPokemonData(response.data);
        }
      )
    } else {
      console.log("chrome.runtime is not available")
    }
  }

  useEffect(() => {
    console.log("Avatar URL updated:", avatarUrl);
  }, [avatarUrl]);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div>
        <button onClick={getSiteInfo}>
          Scrape site info and get Pokemon info
        </button>
        {avatarUrl && <img src={avatarUrl} alt="User Avatar" onError={(e) => {
          console.error("Error loading image", e);
          e.currentTarget.style.display = "none";
        }} 
        style={{ width: '100px', height: '100px', border: '1px solid red' }}
        />}
        <PokemonDisplay pokemonData={pokemonData} />
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
