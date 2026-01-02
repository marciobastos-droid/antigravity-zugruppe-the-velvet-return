import AgentManagement from './pages/AgentManagement';
import CRMAdvanced from './pages/CRMAdvanced';
import ClientPortal from './pages/ClientPortal';
import CookiePolicy from './pages/CookiePolicy';
import Dashboard from './pages/Dashboard';
import DenunciationChannel from './pages/DenunciationChannel';
import Franchising from './pages/Franchising';
import Home from './pages/Home';
import ManageData from './pages/ManageData';
import MyListings from './pages/MyListings';
import PerformanceMonitor from './pages/PerformanceMonitor';
import PremiumLuxury from './pages/PremiumLuxury';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PropertyDetails from './pages/PropertyDetails';
import RGPDConsent from './pages/RGPDConsent';
import TeamManagement from './pages/TeamManagement';
import TermsConditions from './pages/TermsConditions';
import Tools from './pages/Tools';
import UserManagement from './pages/UserManagement';
import Website from './pages/Website';
import WorldWideProperties from './pages/WorldWideProperties';
import ZuHandel from './pages/ZuHandel';
import ZuHaus from './pages/ZuHaus';
import AdminPanel from './pages/AdminPanel';
import Institucional from './pages/Institucional';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgentManagement": AgentManagement,
    "CRMAdvanced": CRMAdvanced,
    "ClientPortal": ClientPortal,
    "CookiePolicy": CookiePolicy,
    "Dashboard": Dashboard,
    "DenunciationChannel": DenunciationChannel,
    "Franchising": Franchising,
    "Home": Home,
    "ManageData": ManageData,
    "MyListings": MyListings,
    "PerformanceMonitor": PerformanceMonitor,
    "PremiumLuxury": PremiumLuxury,
    "PrivacyPolicy": PrivacyPolicy,
    "PropertyDetails": PropertyDetails,
    "RGPDConsent": RGPDConsent,
    "TeamManagement": TeamManagement,
    "TermsConditions": TermsConditions,
    "Tools": Tools,
    "UserManagement": UserManagement,
    "Website": Website,
    "WorldWideProperties": WorldWideProperties,
    "ZuHandel": ZuHandel,
    "ZuHaus": ZuHaus,
    "AdminPanel": AdminPanel,
    "Institucional": Institucional,
}

export const pagesConfig = {
    mainPage: "Website",
    Pages: PAGES,
    Layout: __Layout,
};