import PropertyDetails from './pages/PropertyDetails';
import AddListing from './pages/AddListing';
import MyListings from './pages/MyListings';
import UserManagement from './pages/UserManagement';
import ClientPreferences from './pages/ClientPreferences';
import VideoMaker from './pages/VideoMaker';
import Tools from './pages/Tools';
import Dashboard from './pages/Dashboard';
import AgentManagement from './pages/AgentManagement';
import Contracts from './pages/Contracts';
import DocumentsHub from './pages/DocumentsHub';
import Home from './pages/Home';
import CRMAdvanced from './pages/CRMAdvanced';
import ClientPortal from './pages/ClientPortal';
import Reports from './pages/Reports';
import TeamManagement from './pages/TeamManagement';
import Franchising from './pages/Franchising';
import GmailCallback from './pages/GmailCallback';
import PrivacyPolicy from './pages/PrivacyPolicy';
import DenunciationChannel from './pages/DenunciationChannel';
import TermsConditions from './pages/TermsConditions';
import CookiePolicy from './pages/CookiePolicy';
import ManageData from './pages/ManageData';
import ZuHaus from './pages/ZuHaus';
import ZuHandel from './pages/ZuHandel';
import InvestorSection from './pages/InvestorSection';
import Website from './pages/Website';
import Subscriptions from './pages/Subscriptions';
import Support from './pages/Support';
import __Layout from './Layout.jsx';


export const PAGES = {
    "PropertyDetails": PropertyDetails,
    "AddListing": AddListing,
    "MyListings": MyListings,
    "UserManagement": UserManagement,
    "ClientPreferences": ClientPreferences,
    "VideoMaker": VideoMaker,
    "Tools": Tools,
    "Dashboard": Dashboard,
    "AgentManagement": AgentManagement,
    "Contracts": Contracts,
    "DocumentsHub": DocumentsHub,
    "Home": Home,
    "CRMAdvanced": CRMAdvanced,
    "ClientPortal": ClientPortal,
    "Reports": Reports,
    "TeamManagement": TeamManagement,
    "Franchising": Franchising,
    "GmailCallback": GmailCallback,
    "PrivacyPolicy": PrivacyPolicy,
    "DenunciationChannel": DenunciationChannel,
    "TermsConditions": TermsConditions,
    "CookiePolicy": CookiePolicy,
    "ManageData": ManageData,
    "ZuHaus": ZuHaus,
    "ZuHandel": ZuHandel,
    "InvestorSection": InvestorSection,
    "Website": Website,
    "Subscriptions": Subscriptions,
    "Support": Support,
}

export const pagesConfig = {
    mainPage: "Website",
    Pages: PAGES,
    Layout: __Layout,
};