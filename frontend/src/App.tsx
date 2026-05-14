import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {

  const [servers, setServers] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])

  useEffect(() => {

    axios
      .get('http://127.0.0.1:8000/api/servers/')
      .then((response) => {

        console.log('SERVERS:', response.data)

        setServers(response.data)

      })

  }, [])

  const loadChannels = (serverId: number) => {

    console.log('CLICK SERVER:', serverId)

    axios
      .get(
        `http://127.0.0.1:8000/api/channels/?server=${serverId}`
      )
      .then((response) => {

        console.log('CHANNELS:', response.data)

        setChannels(response.data)

      })
  }

  return (
    <div
      style={{
        display: 'flex',
        background: '#111',
        color: 'white',
        minHeight: '100vh'
      }}
    >

      {/* SERVERS */}
      <div
        style={{
          width: '120px',
          background: '#000',
          padding: '20px'
        }}
      >

        <h2>SERVERS</h2>

        {servers.map((server) => (

          <div
            key={server.id}

            onClick={() => loadChannels(server.id)}

            style={{
              background: '#333',
              padding: '10px',
              marginTop: '10px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            {server.name}
          </div>

        ))}

      </div>

      {/* CHANNELS */}
      <div
        style={{
          flex: 1,
          padding: '20px'
        }}
      >

        <h1>CHANNELS</h1>

        {channels.map((channel) => (

          <div
            key={channel.id}

            style={{
              background: '#222',
              padding: '10px',
              marginTop: '10px',
              borderRadius: '10px'
            }}
          >
            # {channel.name}
          </div>

        ))}

      </div>

    </div>
  )
}

export default App