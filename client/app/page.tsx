import FileUploadComponent from './components/file-upload';
import ChatComponent from './components/chat';

export default function Home() {
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-84px)] w-screen">
      {/* Sidebar - File Upload */}
      <div className="w-full md:w-[30vw] p-6 bg-gray-100 flex justify-center items-center border-b-2 md:border-b-0 md:border-r-2">
        <FileUploadComponent />
      </div>

      {/* Main Content - Chat */}
      <div className="w-full md:w-[70vw] flex flex-col">
        <div className="flex-grow overflow-y-auto bg-white">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
}
