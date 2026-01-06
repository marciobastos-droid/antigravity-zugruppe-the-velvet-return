import ActivityFeed from './pages/ActivityFeed';
import AdminDashboard from './pages/AdminDashboard';
import AdminPanel from './pages/AdminPanel';
import AgentManagement from './pages/AgentManagement';
import CRMAdvanced from './pages/CRMAdvanced';
import ClientPortal from './pages/ClientPortal';
import CookiePolicy from './pages/CookiePolicy';
import Dashboard from './pages/Dashboard';
import DenunciationChannel from './pages/DenunciationChannel';
import Franchising from './pages/Franchising';
import Home from './pages/Home';
import Institucional from './pages/Institucional';
import ManageData from './pages/ManageData';
import MetaAdsCreator from './pages/MetaAdsCreator';
import MyListings from './pages/MyListings';
import PerformanceMonitor from './pages/PerformanceMonitor';
import PremiumLuxury from './pages/PremiumLuxury';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PropertyDetails from './pages/PropertyDetails';
import RGPDConsent from './pages/RGPDConsent';
import SitemapXML from './pages/SitemapXML';
import Subscriptions from './pages/Subscriptions';
import TeamManagement from './pages/TeamManagement';
import TermsConditions from './pages/TermsConditions';
import Tools from './pages/Tools';
import UpgradePlan from './pages/UpgradePlan';
import Website from './pages/Website';
import WorldWideProperties from './pages/WorldWideProperties';
import ZuHandel from './pages/ZuHandel';
import ZuHaus from './pages/ZuHaus';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityFeed": ActivityFeed,
    "AdminDashboard": AdminDashboard,
    "AdminPanel": AdminPanel,
    "AgentManagement": AgentManagement,
    "CRMAdvanced": CRMAdvanced,
    "ClientPortal": ClientPortal,
    "CookiePolicy": CookiePolicy,
    "Dashboard": Dashboard,
    "DenunciationChannel": DenunciationChannel,
    "Franchising": Franchising,
    "Home": Home,
    "Institucional": Institucional,
    "ManageData": ManageData,
    "MetaAdsCreator": MetaAdsCreator,
    "MyListings": MyListings,
    "PerformanceMonitor": PerformanceMonitor,
    "PremiumLuxury": PremiumLuxury,
    "PrivacyPolicy": PrivacyPolicy,
    "PropertyDetails": PropertyDetails,
    "RGPDConsent": RGPDConsent,
    "SitemapXML": SitemapXML,
    "Subscriptions": Subscriptions,
    "TeamManagement": TeamManagement,
    "TermsConditions": TermsConditions,
    "Tools": Tools,
    "UpgradePlan": UpgradePlan,
    "Website": Website,
    "WorldWideProperties": WorldWideProperties,
    "ZuHandel": ZuHandel,
    "ZuHaus": ZuHaus,
    "AnalyticsDashboard": AnalyticsDashboard,
}

export const pagesConfig = {
    mainPage: "Website",
    Pages: PAGES,
    Layout: __Layout,
};