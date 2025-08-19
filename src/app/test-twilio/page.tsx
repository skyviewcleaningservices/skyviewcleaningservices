'use client';

import { useState } from 'react';

export default function TestTwilioPage() {
  const [authToken, setAuthToken] = useState('');
  const [bookingData, setBookingData] = useState({
    name: 'John Doe',
    serviceType: 'deep-cleaning',
    date: '2024-01-15',
    time: '14:00'
  });
  
  const contentVariablesExample = '{"1":"Customer Name","2":"Service Type","3":"Date","4":"Time"}';
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
    error?: any;
    curlEquivalent?: string;
  } | null>(null);

  const handleTest = async () => {
    if (!authToken.trim()) {
      alert('Please enter your AuthToken');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-twilio-curl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authToken: authToken.trim(),
          bookingData: bookingData
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Twilio Curl Implementation Test</h1>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Original Curl Command</h2>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{`curl 'https://api.twilio.com/2010-04-01/Accounts/AC4184fe3a912f3f52fd8554f76ef494d8/Messages.json' -X POST \\
--data-urlencode 'To=whatsapp:+919623707524' \\
--data-urlencode 'From=whatsapp:+14155238886' \\
--data-urlencode 'ContentSid=HXb5b62575e6e4ff6129ad7c8efe1f983e' \\
--data-urlencode 'ContentVariables={"1":"Customer Name","2":"Service Type","3":"Date","4":"Time"}' \\
-u AC4184fe3a912f3f52fd8554f76ef494d8:[AuthToken]`}</pre>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Account SID:</strong> AC4184fe3a912f3f52fd8554f76ef494d8
              </div>
              <div>
                <strong>To:</strong> whatsapp:+919623707524
              </div>
              <div>
                <strong>From:</strong> whatsapp:+14155238886
              </div>
              <div>
                <strong>ContentSid:</strong> HXb5b62575e6e4ff6129ad7c8efe1f983e
              </div>
              <div className="md:col-span-2">
                <strong>ContentVariables:</strong> {contentVariablesExample}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Test the Implementation</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="authToken" className="block text-sm font-medium text-gray-700 mb-2">
                  Twilio Auth Token *
                </label>
                <input
                  type="password"
                  id="authToken"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Enter your Twilio Auth Token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your Auth Token from your Twilio Console
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={bookingData.name}
                    onChange={(e) => setBookingData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type
                  </label>
                  <select
                    id="serviceType"
                    value={bookingData.serviceType}
                    onChange={(e) => setBookingData(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="deep-cleaning">Deep Cleaning</option>
                    <option value="regular-cleaning">Regular Cleaning</option>
                    <option value="full-deep-cleaning">Full Deep Cleaning</option>
                    <option value="post-construction">Post-Construction Cleaning</option>
                    <option value="special-occasion">Special Occasion Cleaning</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={bookingData.date}
                    onChange={(e) => setBookingData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    value={bookingData.time}
                    onChange={(e) => setBookingData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={handleTest}
                disabled={isLoading || !authToken.trim()}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Testing...' : 'Test Twilio API'}
              </button>
            </div>
          </div>

          {result && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Result</h2>
              <div className={`p-4 rounded-lg ${result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
                }`}>
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full mr-2 ${result.success ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  <span className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                    {result.success ? 'Success' : 'Error'}
                  </span>
                </div>
                <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                  {result.message}
                </p>

                {result.data && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-gray-800 mb-1">Response Data:</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.data as object, null, 2)}
                    </pre>
                  </div>
                )}

                {result.error && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-red-800 mb-1">Error Details:</h4>
                    <pre className="text-xs bg-red-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.error as object, null, 2)}
                    </pre>
                  </div>
                )}

                {result.curlEquivalent && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-gray-800 mb-1">Equivalent Curl Command:</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {result.curlEquivalent}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Get your Twilio Auth Token from your Twilio Console</li>
              <li>Enter the Auth Token in the field above</li>
              <li>Click "Test Twilio API" to send the template message</li>
              <li>Check the result to see if the message was sent successfully</li>
              <li>If successful, you should receive a WhatsApp message with the template</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
