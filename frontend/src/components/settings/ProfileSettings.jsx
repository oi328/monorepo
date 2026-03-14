import { useState } from 'react'

const ProfileSettings = () => {
  const [form, setForm] = useState({
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+201234567890',
    avatar: '',
    password: '',
    language: 'en',
    theme: 'light'
  })

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg text-theme-text font-semibold mb-4">Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Full Name</label>
              <input value={form.fullName} onChange={e=>setField('fullName', e.target.value)} className="input-soft w-full" placeholder="Full Name" />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" value={form.email} onChange={e=>setField('email', e.target.value)} className="input-soft w-full" placeholder="Email" />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input value={form.phone} onChange={e=>setField('phone', e.target.value)} className="input-soft w-full" placeholder="Phone" />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input type="password" value={form.password} onChange={e=>setField('password', e.target.value)} className="input-soft w-full" placeholder="New Password" />
            </div>
            <div>
              <label className="block text-sm mb-1">Language</label>
              <select value={form.language} onChange={e=>setField('language', e.target.value)} className="input-soft w-full">
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Theme</label>
              <select value={form.theme} onChange={e=>setField('theme', e.target.value)} className="input-soft w-full">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button className="btn btn-primary">Save Changes</button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Avatar</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              {form.avatar ? (
                <img src={form.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">NO</div>
              )}
            </div>
            <label className="btn btn-glass inline-flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>{
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => setField('avatar', reader.result)
                reader.readAsDataURL(file)
              }} />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileSettings