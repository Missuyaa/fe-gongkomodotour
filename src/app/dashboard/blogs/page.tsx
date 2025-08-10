"use client"

import { useState, useEffect } from "react"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { Blog } from "@/types/blog"
import { apiRequest } from "@/lib/api"

export default function BlogPage() {
  const [data, setData] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching blogs from API...')
      
      const response = await apiRequest<{ data: Blog[] }>(
        'GET',
        '/api/blogs'
      )
      
      console.log('API Response:', response)
      setData(response.data || [])
      setError(null)
      setDebugInfo(response)
    } catch (err: unknown) {
      console.error('Full error object:', err)
      
      let errorMessage = "Gagal mengambil data blog"
      let debugData: Record<string, unknown> | null = null
      
      if (err instanceof Error) {
        errorMessage = err.message
        debugData = {
          name: err.name,
          message: err.message,
          stack: err.stack
        }
      } else if (typeof err === 'object' && err !== null) {
        debugData = err as Record<string, unknown>
        if ('response' in err && err.response) {
          const response = (err as { response: { status: number; statusText: string; data?: unknown } }).response
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
          if (response.data) {
            errorMessage += ` - ${JSON.stringify(response.data)}`
          }
        } else if ('message' in err) {
          errorMessage = (err as { message: string }).message
        }
      }
      
      setError(errorMessage)
      setDebugInfo(debugData)
      console.error("Error fetching blogs:", err)
    } finally {
      setLoading(false)
    }
  }

  const testAPIConnection = async () => {
    try {
      console.log('Testing API connection...');
      
      // Test 1: Basic connectivity
      const testUrl = 'https://api.gongkomodotour.com/api/blogs';
      console.log('Testing URL:', testUrl);
      
      // Test dengan fetch native
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Fetch Response Status:', response.status);
      console.log('Fetch Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetch Response Data:', data);
        alert(`API berhasil diakses! Status: ${response.status}`);
      } else {
        const errorText = await response.text();
        console.error('Fetch Error Response:', errorText);
        alert(`API Error: ${response.status} - ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Test API Error:', error);
      alert(`Test API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testWithCurl = () => {
    const curlCommand = `curl -X GET "https://api.gongkomodotour.com/api/blogs" -H "Accept: application/json" -H "Content-Type: application/json"`;
    console.log('Curl command to test:', curlCommand);
    alert(`Curl command untuk test:\n${curlCommand}\n\nCheck console untuk detail.`);
  };

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <div className="container mx-auto p-4">Loading...</div>
  
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">Error Loading Blogs</h2>
          <p className="text-red-700 mb-4">{error}</p>
          
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-medium text-blue-800 mb-2">Debug Information:</h3>
            <p className="text-sm text-blue-700">API URL: {process.env.NEXT_PUBLIC_API_URL || 'https://api.gongkomodotour.com'}</p>
            <p className="text-sm text-blue-700">Endpoint: /api/blogs</p>
            <p className="text-sm text-blue-700">Method: GET</p>
          </div>
          
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-medium text-yellow-800 mb-2">Troubleshooting Steps:</h3>
            <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
              <li>Klik &quot;Test API Connection&quot; untuk test koneksi langsung</li>
              <li>Periksa console browser untuk detail error</li>
              <li>Pastikan server API berfungsi</li>
              <li>Cek apakah endpoint /api/blogs tersedia</li>
              <li>Hubungi backend team jika masalah berlanjut</li>
            </ol>
          </div>
          
          {debugInfo && (
            <details className="mt-4">
              <summary className="cursor-pointer text-red-600 font-medium">Full Error Details</summary>
              <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2 mt-4">
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Coba Lagi
            </button>
            <button 
              onClick={testAPIConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test API Connection
            </button>
            <button 
              onClick={testWithCurl}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Show Curl Command
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
          <p className="text-gray-500 mt-1">Manage data dan informasi blog</p>
        </div>
      </div>
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <DataTable
          columns={columns()}
          data={data}
          setData={setData}
        />
      </div>
    </div>
  )
}
