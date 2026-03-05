import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/tutorial.css';
import toast from 'react-hot-toast';

const driverConfig = {
  showProgress: true,
  allowClose: true,
  overlayOpacity: 0.25,
  smoothScroll: true,
  stagePadding: 20,
  stageRadius: 12,
  popoverClass: 'driver-tutorial-cartoon',
  popoverOffset: 12,
  nextBtnText: 'Next',
  prevBtnText: 'Back',
  doneBtnText: 'Done',
};

const stepsByPath = {
  '/': [
    {
      popover: {
        title: 'Welcome!',
        description: 'This quick tour will show you around. Click Next to continue.',
        side: 'over',
      },
    },
    {
      element: '[data-tour="module-card"]',
      popover: {
        title: 'Quick Access',
        description: 'Click a module card to get started. Copiers opens the full service area; Meter Readings takes you straight to capture and history.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="sidebar"]',
      popover: {
        title: 'Navigation',
        description: 'Use the sidebar to move between sections. Home, Copier Service (Customers, Meter Readings, Machines, Consumable Summary), and Admin tools if you have access.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="branch-selector"]',
      popover: {
        title: 'Switch Branch',
        description: 'If you have access to multiple branches, use this dropdown to switch between Johannesburg (JHB) and Cape Town (CT). Your view and data will update.',
        side: 'right',
      },
    },
  ],
  '/copier-service': [
    {
      popover: {
        title: 'Copier Service',
        description: 'This is your main hub. You have four areas: Customers, Meter Readings, Machines, and Consumable Summary (in the sidebar). Let\'s go through each.',
        side: 'over',
      },
    },
    {
      element: '[data-tour="copier-tile-customers"]',
      popover: {
        title: 'Customers',
        description: 'Manage your clients: add, edit, archive, delete. Click a customer to see their machines and order consumables (toner, parts). Order consumables from Customer → Machine → Order consumable.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="copier-tile-meter-readings"]',
      popover: {
        title: 'Meter Readings',
        description: 'Capture monthly meter counts (Mono, Colour, Scan), view history, and export as Excel or Text. Admins can import readings in bulk and unlock months.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="copier-tile-machines"]',
      popover: {
        title: 'Machines',
        description: 'Add and edit copier machines, link them to customers, decommission old units. View usage stats, machine life cycle, and monthly usage per machine.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar"]',
      popover: {
        title: 'Consumable Summary',
        description: 'In the sidebar under Copier Service, Consumable Summary shows consumable status per machine. Filter by part type and compliance. Admins can import past orders.',
        side: 'right',
      },
    },
  ],
  '/customers': [
    {
      popover: { title: 'Customers', description: 'Manage customers and their machines.', side: 'over' },
    },
    {
      element: '[data-tour="customers-header"]',
      popover: {
        title: 'Customers',
        description: 'View all customers. Click a customer tile to see their machines and order consumables. Admins can add, edit, archive, or delete customers.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="customers-grid"]',
      popover: {
        title: 'Customer Tiles',
        description: 'Each tile shows the customer name and machine count. Archived customers are greyed out. Toner alerts appear when consumables are due.',
        side: 'top',
      },
    },
  ],
  '/meter-readings': [
    {
      popover: {
        title: 'Meter Readings',
        description: 'Your hub for all meter reading tasks. Capture monthly counts, view history, export data, and manage machines. Admins can bulk import.',
        side: 'over',
      },
    },
    {
      element: '[data-tour="capture-progress"]',
      popover: {
        title: 'Capture Progress',
        description: 'See how much of the current month\'s readings are done. Red = low, orange = medium, green = complete. Shows JHB and CT separately if you have multi-branch access.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="meter-action-capture"]',
      popover: {
        title: 'Monthly Capture',
        description: 'Enter Mono, Colour and Scan readings per machine. Save edits, add notes, search by serial or customer. Export Excel or Text when 100% complete locks the month.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="meter-action-history"]',
      popover: {
        title: 'History',
        description: 'Browse past months. View all submitted readings with usage. Export as Excel or Text. Includes decommissioned machines for historical reference.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="meter-action-machines"]',
      popover: {
        title: 'Machines',
        description: 'Jump to the machine list to add, edit, or decommission copiers. Or use the sidebar under Copier Service.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="meter-action-import"]',
      popover: {
        title: 'Import Readings (Admin)',
        description: 'Bulk import meter readings from Excel or CSV. Upload a file matching the expected format (serial, month, meter columns).',
        side: 'right',
      },
    },
  ],
  '/capture': [
    {
      popover: {
        title: 'Monthly Capture',
        description: 'Enter meter readings for each machine. Save regularly. Export when 100% complete. Admins can unlock locked months.',
        side: 'over',
      },
    },
    {
      element: '[data-tour="month-nav"]',
      popover: {
        title: 'Select Month',
        description: 'Use the arrows to switch between months. You can work on any month.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="submit-buttons"]',
      popover: {
        title: 'Save & Export',
        description: 'Save Changes stores your edits without locking. Export Excel or Export Text finalizes the month, downloads the file, and locks it. Admins can export before 100%.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="capture-locked"]',
      popover: {
        title: 'Locked Month',
        description: 'When a month is exported, it\'s locked. Admins can Unlock to allow edits again.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="summary-bar"]',
      popover: {
        title: 'Progress Summary',
        description: 'Total machines, captured vs pending. Bar turns green at 100%. Complete all to export.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="search-machines"]',
      popover: {
        title: 'Search',
        description: 'Filter by serial number, customer name, or contract reference.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="readings-table"]',
      popover: {
        title: 'Readings Table',
        description: 'Enter Mono, Colour, Scan in the input fields. Add notes per machine (admins get notified). Edits highlight in blue. Click a machine row to open its consumables page. Admins can delete readings.',
        side: 'top',
      },
    },
  ],
  '/history': [
    {
      popover: {
        title: 'Reading History',
        description: 'View past months, export as Excel or Text. Includes decommissioned machines. Shows usage and notes.',
        side: 'over',
      },
    },
    {
      element: '[data-tour="history-month-nav"]',
      popover: {
        title: 'Select Month',
        description: 'Use arrows to browse months. Cannot go before January 2026.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="history-export"]',
      popover: {
        title: 'Export',
        description: 'Export Excel (spreadsheet) or Text (plain file) for the selected month. Both include all readings.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="history-summary"]',
      popover: {
        title: 'Summary',
        description: 'Total machines, how many captured, how many pending for the selected month.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="history-table"]',
      popover: {
        title: 'Past Readings',
        description: 'Machine, contract, Mono, Colour, Scan, usage since last month, notes. First reading shows 0 usage. Status: OK, Note Only, or Not captured.',
        side: 'top',
      },
    },
  ],
  '/machines': [
    {
      popover: { title: 'Machines', description: 'Manage your copier machines.', side: 'over' },
    },
    {
      element: '[data-tour="add-machine"]',
      popover: {
        title: 'Add Machine',
        description: 'Click to register a new copier. Enter serial number, customer, meter types, and branch.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="machines-search"]',
      popover: {
        title: 'Search Machines',
        description: 'Filter by serial number, customer, or contract reference.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="machines-table"]',
      popover: {
        title: 'Machine List',
        description: 'View machines by model or in a table. Use Edit, Decommission, or Delete as needed. Click a machine to view consumables.',
        side: 'top',
      },
    },
  ],
  '/consumables/summary': [
    {
      element: '[data-tour="consumables-summary"]',
      popover: {
        title: 'Consumable Summary',
        description: 'Overview of consumable status per machine. Filter by part type and compliance. Admins can import past orders.',
        side: 'bottom',
      },
    },
  ],
  '/users': [
    {
      element: '[data-tour="users-content"]',
      popover: {
        title: 'User Management',
        description: 'Add users, assign roles (Admin or Meter User), and set branches. Admins have full access; Meter Users capture readings.',
        side: 'bottom',
      },
    },
  ],
  '/import-readings': [
    {
      element: '[data-tour="import-content"]',
      popover: {
        title: 'Import Readings',
        description: 'Upload an Excel or CSV file to bulk-import meter readings. The file must match the expected format (serial, month, meter columns).',
        side: 'bottom',
      },
    },
  ],
  '/transaction-history': [
    {
      element: '[data-tour="audit-table"]',
      popover: {
        title: 'Audit Log',
        description: 'See who did what and when: submissions, exports, unlocks, machine changes, imports, and user actions.',
        side: 'top',
      },
    },
  ],
  '/admin/machine-configuration': [
    {
      popover: {
        title: 'Machine Configuration (Admin)',
        description: 'Define makes (Canon, Ricoh, etc.), models, and consumable parts. Machines in Meter Readings → Machines are assigned a make/model. Parts drive consumable ordering.',
        side: 'over',
      },
    },
    {
      element: '[data-tour="machine-config-import"]',
      popover: {
        title: 'Import',
        description: 'Upload a CSV to bulk-create makes, models, and parts. Download the template for the correct format. Columns: make, model, paper_size, model_type, machine_life, part_name, item_code, part_type, toner_color, expected_yield, cost_rand, meter_type.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="machine-config-makes"]',
      popover: {
        title: 'Makes & Models',
        description: 'Expand a make (e.g. Canon) to see its models. Add model: name, A3/A4, mono/colour, machine life. Edit or delete makes and models.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="machine-config-add-make"]',
      popover: {
        title: 'Add Make',
        description: 'Add a new make (brand) such as Canon, Ricoh, or Olivetti. Then add models under it with paper size, type (mono/colour), and lifespan.',
        side: 'top',
      },
    },
  ],
  '/notifications': [
    {
      popover: {
        title: 'Notifications (Admin)',
        description: 'Alerts when part orders are captured or when notes are added to meter readings. Click a notification to open it. Admin only.',
        side: 'over',
      },
    },
    {
      element: '[data-tour="notifications-header"]',
      popover: {
        title: 'Notifications',
        description: 'You receive alerts when: (1) A consumable part order is recorded, (2) A capturer adds a note to a meter reading. Stay informed without checking each page.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="notifications-mark-all"]',
      popover: {
        title: 'Mark All as Read',
        description: 'When you have unread notifications, use this to mark them all as read at once. The red dot on the sidebar bell will clear.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="notifications-list"]',
      popover: {
        title: 'Notification List',
        description: 'Each item shows the alert type (part order or reading note), message, and time. Click to mark as read and jump to the related page (machine, capture). Unread items are highlighted.',
        side: 'top',
      },
    },
  ],
};

function getStepsForPath(pathname, isAdmin) {
  const exact = stepsByPath[pathname];
  if (exact) return exact;

  // Fallbacks for nested paths
  if (pathname.startsWith('/capture')) return stepsByPath['/capture'];
  if (pathname.startsWith('/history')) return stepsByPath['/history'];
  if (pathname.startsWith('/machines')) return stepsByPath['/machines'];
  if (pathname.startsWith('/customers')) return stepsByPath['/customers'];
  if (pathname.startsWith('/consumables')) return stepsByPath['/consumables/summary'];
  if (pathname.startsWith('/users')) return isAdmin ? stepsByPath['/users'] : stepsByPath['/'];
  if (pathname.startsWith('/import-readings')) return isAdmin ? stepsByPath['/import-readings'] : stepsByPath['/'];
  if (pathname.startsWith('/transaction-history')) return isAdmin ? stepsByPath['/transaction-history'] : stepsByPath['/'];
  if (pathname.startsWith('/notifications')) return isAdmin ? stepsByPath['/notifications'] : stepsByPath['/'];
  if (pathname.startsWith('/meter-readings')) return stepsByPath['/meter-readings'];
  if (pathname === '/copier-service') return stepsByPath['/copier-service'];
  if (pathname.startsWith('/admin/machine-configuration') || pathname === '/admin') return isAdmin ? stepsByPath['/admin/machine-configuration'] : stepsByPath['/'];

  return stepsByPath['/'];
}

/**
 * Start the interactive tutorial for the current page.
 */
export function startTutorial(pathname = window.location.pathname, isAdmin = false) {
  // Defer to next tick so DOM is fully rendered
  requestAnimationFrame(() => {
    const steps = getStepsForPath(pathname, isAdmin);

    const validSteps = steps.filter((step) => {
      if (!step.element) return true; // Steps without element (e.g. welcome) always valid
      const sel = typeof step.element === 'string' ? step.element : null;
      if (!sel) return true;
      return document.querySelector(sel);
    });

    if (validSteps.length === 0) {
      toast('No tour available for this page', { icon: 'ℹ️' });
      return;
    }

    try {
      const driverObj = driver({
        ...driverConfig,
        steps: validSteps,
      });
      driverObj.drive();
    } catch (err) {
      console.error('Tutorial error:', err);
      toast.error('Tour could not start');
    }
  });
}
