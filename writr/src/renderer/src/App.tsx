import {
  Content,
  RootLayout,
  Sidebar,
  DraggableTopBar,
  ActionButtonsRow,
  NotePreviewList
} from './components'

const App = () => {
  return (
    <RootLayout>
      <DraggableTopBar />
      <Sidebar className="p-2">
        <ActionButtonsRow className="flex justify-between mt-1 " />
        <NotePreviewList className="mt-3 space-y-1" />
      </Sidebar>
      <Content className="border-l bg-zinc-900/50 border-l-white/20">Content</Content>
    </RootLayout>
  )
}

export default App
