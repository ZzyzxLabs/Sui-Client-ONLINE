import MoveExecutor from "@/component/moveExe";
import Nav from "@/component/nav";

export default function Home() {
  return (
    <div
      className="relative w-full min-h-screen"
      style={{
        backgroundImage: "url('./suiOL.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-slate-900/30"></div>
      
      {/* Content */}
      <div className="relative z-10">
        <Nav />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
          <MoveExecutor />
        </div>
      </div>
    </div>
  );
}
