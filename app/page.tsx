import VideoConference from "@/components/VideoConference";

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Video Conference</h1>
        <VideoConference />
      </div>
    </main>
  );
}