import AgentManagement from './pages/AgentManagement';
import CRMAdvanced from './pages/CRMAdvanced';
import ClientPortal from './pages/ClientPortal';
import CookiePolicy from './pages/CookiePolicy';
import Dashboard from './pages/Dashboard';
import DenunciationChannel from './pages/DenunciationChannel';
import Franchising from './pages/Franchising';
import ManageData from './pages/ManageData';
import MyListings from './pages/MyListings';
import PerformanceMonitor from './pages/PerformanceMonitor';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PropertyDetails from './pages/PropertyDetails';
import RGPDConsent from './pages/RGPDConsent';
import Subscriptions from './pages/Subscriptions';
import TeamManagement from './pages/TeamManagement';
import TermsConditions from './pages/TermsConditions';
import Tools from './pages/Tools';
import UserManagement from './pages/UserManagement';
import Website from './pages/Website';
import ZuHandel from './pages/ZuHandel';
import ZuHaus from './pages/ZuHaus';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgentManagement": AgentManagement,
    "CRMAdvanced": CRMAdvanced,
    "ClientPortal": ClientPortal,
    "CookiePolicy": CookiePolicy,
    "Dashboard": Dashboard,
    "DenunciationChannel": DenunciationChannel,
    "Franchising": Franchising,
    "ManageData": ManageData,
    "MyListings": MyListings,
    "PerformanceMonitor": PerformanceMonitor,
    "PrivacyPolicy": PrivacyPolicy,
    "PropertyDetails": PropertyDetails,
    "RGPDConsent": RGPDConsent,
    "Subscriptions": Subscriptions,
    "TeamManagement": TeamManagement,
    "TermsConditions": TermsConditions,
    "Tools": Tools,
    "UserManagement": UserManagement,
    "Website": Website,
    "ZuHandel": ZuHandel,
    "ZuHaus": ZuHaus,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Website",
    Pages: PAGES,
    Layout: __Layout,
};