import TopNav from './TopNav';
import BottomNav from './BottomNav';

interface Props {
  children: React.ReactNode;
  noPaddingTop?: boolean;
}

export default function AppShell({ children, noPaddingTop = false }: Props) {
  return (
    <>
      <TopNav />
      <main className={`min-h-screen pb-20 md:pb-0 ${noPaddingTop ? '' : 'md:pt-[60px]'}`}>
        {children}
      </main>
      <BottomNav />
    </>
  );
}
