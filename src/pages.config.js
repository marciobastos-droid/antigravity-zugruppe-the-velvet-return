import Browse from './pages/Browse';
import PropertyDetails from './pages/PropertyDetails';
import AddListing from './pages/AddListing';
import MyListings from './pages/MyListings';
import Opportunities from './pages/Opportunities';
import UserManagement from './pages/UserManagement';
import ClientPreferences from './pages/ClientPreferences';
import VideoMaker from './pages/VideoMaker';
import Tools from './pages/Tools';
import Dashboard from './pages/Dashboard';
import AgentManagement from './pages/AgentManagement';
import Contracts from './pages/Contracts';
import DocumentsHub from './pages/DocumentsHub';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Browse": Browse,
    "PropertyDetails": PropertyDetails,
    "AddListing": AddListing,
    "MyListings": MyListings,
    "Opportunities": Opportunities,
    "UserManagement": UserManagement,
    "ClientPreferences": ClientPreferences,
    "VideoMaker": VideoMaker,
    "Tools": Tools,
    "Dashboard": Dashboard,
    "AgentManagement": AgentManagement,
    "Contracts": Contracts,
    "DocumentsHub": DocumentsHub,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};