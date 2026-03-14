import { useState, useRef, useEffect } from 'react'
import {
  Activity, AlertCircle, AlertTriangle, Archive, ArrowRight, ArrowUpRight, Award, Ban, Banknote, BarChart, BarChart2, Bell, Book, Bookmark, Box, Briefcase, Calendar, CalendarCheck, CalendarClock, CalendarDays, Camera, Check, CheckCircle, CheckSquare, ChevronRight, Circle, Clipboard, ClipboardCheck, ClipboardList, Clock, Cloud, Code, Coins, Contact, Copy, CreditCard, Database, DollarSign, Download, Edit, Edit2, Edit3, Eye, File, FileText, Filter, Flag, Flame, Folder, FolderOpen, Frown, Gift, Globe, GripVertical, Handshake, Hash, Heart, HelpCircle, History, Home, Image, Inbox, Info, Key, Layers, Layout, LifeBuoy, Link, List, Lock, LogOut, Mail, Map, MapPin, Meh, Menu, MessageCircle, MessageSquare, Mic, Minus, Monitor, Moon, MoreHorizontal, MoreVertical, MousePointer, Move, Music, Package, Paperclip, Pause, PenTool, Phone, PhoneCall, PhoneForwarded, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, PieChart, Pin, Play, Plus, PlusCircle, Power, Printer, RefreshCcw, RefreshCw, Repeat, Save, Search, Send, Settings, Share, Share2, Shield, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingCart, Slash, Sliders, Smile, Speaker, Star, StopCircle, Sun, Tag, Target, Terminal, ThumbsDown, ThumbsUp, Timer, ToggleLeft, ToggleRight, Trash, Trash2, TrendingDown, TrendingUp, Triangle, Truck, Tv, Unlock, Upload, User, UserCheck, UserMinus, UserPlus, UserX, Users, Video, VideoOff, Voicemail, Volume, Volume1, Volume2, VolumeX, Wallet, Watch, Wifi, WifiOff, Wrench, X, XCircle, XOctagon, XSquare, Zap, ZoomIn, ZoomOut
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Create a map of all available icons
export const ICON_MAP = {
  Activity, AlertCircle, AlertTriangle, Archive, ArrowRight, ArrowUpRight, Award, Ban, Banknote, BarChart, BarChart2, Bell, Book, Bookmark, Box, Briefcase, Calendar, CalendarCheck, CalendarClock, CalendarDays, Camera, Check, CheckCircle, CheckSquare, ChevronRight, Circle, Clipboard, ClipboardCheck, ClipboardList, Clock, Cloud, Code, Coins, Contact, Copy, CreditCard, Database, DollarSign, Download, Edit, Edit2, Edit3, Eye, File, FileText, Filter, Flag, Flame, Folder, FolderOpen, Frown, Gift, Globe, GripVertical, Handshake, Hash, Heart, HelpCircle, History, Home, Image, Inbox, Info, Key, Layers, Layout, LifeBuoy, Link, List, Lock, LogOut, Mail, Map, MapPin, Meh, Menu, MessageCircle, MessageSquare, Mic, Minus, Monitor, Moon, MoreHorizontal, MoreVertical, MousePointer, Move, Music, Package, Paperclip, Pause, PenTool, Phone, PhoneCall, PhoneForwarded, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, PieChart, Pin, Play, Plus, PlusCircle, Power, Printer, RefreshCcw, RefreshCw, Repeat, Save, Search, Send, Settings, Share, Share2, Shield, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingCart, Slash, Sliders, Smile, Speaker, Star, StopCircle, Sun, Tag, Target, Terminal, ThumbsDown, ThumbsUp, Timer, ToggleLeft, ToggleRight, Trash, Trash2, TrendingDown, TrendingUp, Triangle, Truck, Tv, Unlock, Upload, User, UserCheck, UserMinus, UserPlus, UserX, Users, Video, VideoOff, Voicemail, Volume, Volume1, Volume2, VolumeX, Wallet, Watch, Wifi, WifiOff, Wrench, X, XCircle, XOctagon, XSquare, Zap, ZoomIn, ZoomOut
}

export default function IconSelector({ value, onChange }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [wrapperRef])

  const filteredIcons = Object.keys(ICON_MAP).filter(key => 
    key.toLowerCase().includes(search.toLowerCase())
  )

  const SelectedIcon = ICON_MAP[value] || ICON_MAP['BarChart2']

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full border rounded p-2 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SelectedIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <span className="text-sm text-gray-700 dark:text-gray-200">{value || 'Select Icon'}</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-[300px] bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl max-h-[300px] overflow-hidden flex flex-col">
          <div className="p-2 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
            <input
              type="text"
              placeholder={t('Search icons...')}
              className="w-full px-3 py-1.5 text-sm border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-5 gap-2">
              {filteredIcons.map(iconName => {
                const Icon = ICON_MAP[iconName]
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(iconName)
                      setIsOpen(false)
                    }}
                    className={`p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center transition-colors ${value === iconName ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                    title={iconName}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
            {filteredIcons.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                {t('No icons found')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
