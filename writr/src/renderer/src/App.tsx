import { Content, RootLayout, Sidebar, DraggableTopBar } from './components'

const App = () => {
  return (
    <RootLayout>
      <DraggableTopBar />
      <Sidebar className="p-2">Sidebar</Sidebar>
      <Content className="border-l bg-zinc-900/50 border-l-white/20">Content</Content>
    </RootLayout>
  )
}

export default App
