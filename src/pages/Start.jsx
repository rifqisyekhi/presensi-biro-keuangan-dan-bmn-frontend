function Start({ keLogin }) {
  return (
    <div className="h-screen w-full max-w-[400px] mx-auto bg-brand relative overflow-hidden flex flex-col shadow-lg font-sans">
      
      <div className="absolute -top-[20%] -left-[50%] w-[200%] h-[90%] bg-navy rounded-[50%] z-0"></div>
      
      <div className="relative z-10 flex flex-col h-full px-6 py-10">
        
        <div className="mt-[25vh] text-white text-left">
          <p className="text-base font-semibold mb-1">Website Presensi</p>
          <h1 className="text-[38px] leading-tight tracking-wide">
            <strong className="font-extrabold">Bagi Non ASN</strong> Biro Keuangan dan BMN
          </h1>
        </div>

        <div className="mt-auto mb-5 flex flex-col gap-4">
          <button 
            onClick={keLogin}
            className="w-full py-4 rounded-lg text-base font-semibold transition-opacity active:opacity-80 bg-white text-navy"
          >
            Login
          </button>
        </div>
        
      </div>
    </div>
  );
}

export default Start;