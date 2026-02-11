import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/tutorial.css';

const driverConfig = {
  showProgress: true,
  allowClose: true,
  overlayOpacity: 0.75,
  smoothScroll: true,
  stagePadding: 16,
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
      element: '[data-tour="sidebar"]',
      popover: {
        title: 'Navigation',
        description: 'Use the sidebar to move between pages. Home shows your dashboard; Meter Readings gives you access to capture, history, and machines.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="progress-bar"]',
      popover: {
        title: 'Meter Capture Progress',
        description: 'See at a glance how much of the current month\'s meter reading is done. Red = low, orange = medium, green = complete.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="module-card"]',
      popover: {
        title: 'Quick Access',
        description: 'Click any module card to jump straight to that section. Meter Readings takes you to capture, history, and machines.',
        side: 'top',
      },
    },
  ],
  '/meter-readings': [
    {
      element: '[data-tour="capture-progress"]',
      popover: {
        title: 'Capture Progress',
        description: 'Shows how many machines have readings entered this month. Click "Continue Capture" to add or edit readings.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="stats-grid"]',
      popover: {
        title: 'Stats at a Glance',
        description: 'Total machines, how many captured, how many pending, and the percentage complete. These numbers update as you enter readings.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="quick-actions"]',
      popover: {
        title: 'Quick Actions',
        description: 'Enter Readings to capture meter data, View History for past months and exports. Complete pending readings to hit 100%.',
        side: 'top',
      },
    },
  ],
  '/capture': [
    {
      element: '[data-tour="month-nav"]',
      popover: {
        title: 'Select Month',
        description: 'Use the arrows to change which month you\'re entering readings for. You can work on any month.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="submit-buttons"]',
      popover: {
        title: 'Save & Submit',
        description: 'Click Save to store your edits. When 100% complete, Submit & Export Excel finalizes the month and downloads the spreadsheet.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="summary-bar"]',
      popover: {
        title: 'Progress Summary',
        description: 'Total machines, how many captured vs pending. The bar turns green when all readings are entered.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="search-machines"]',
      popover: {
        title: 'Search',
        description: 'Filter machines by serial number, customer, or contract reference.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="readings-table"]',
      popover: {
        title: 'Readings Table',
        description: 'Enter Mono, Colour, and Scan readings in the input fields. Add a note. Edits are highlighted in blue.',
        side: 'top',
      },
    },
  ],
  '/history': [
    {
      element: '[data-tour="history-month-nav"]',
      popover: {
        title: 'Select Month',
        description: 'Browse past months to view submitted readings.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="history-export"]',
      popover: {
        title: 'Export',
        description: 'Download the readings for this month as an Excel file.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="history-table"]',
      popover: {
        title: 'Past Readings',
        description: 'View all submitted readings for the selected month. Includes machine details and meter counts.',
        side: 'top',
      },
    },
  ],
  '/machines': [
    {
      element: '[data-tour="add-machine"]',
      popover: {
        title: 'Add Machine',
        description: 'Click to register a new copier. You\'ll enter serial number, customer, meter types, and branch.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="machines-search"]',
      popover: {
        title: 'Search Machines',
        description: 'Filter the list by serial number, customer, or contract reference.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="machines-table"]',
      popover: {
        title: 'Machine List',
        description: 'View all machines. Use Edit to change details, Decommission for machines no longer in use, or Delete to remove.',
        side: 'top',
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
        description: 'Upload an Excel file to bulk-import meter readings. The file must match the expected format (serial, month, meter columns).',
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
};

function getStepsForPath(pathname, isAdmin) {
  // Match exact or prefix for nested routes
  const exact = stepsByPath[pathname];
  if (exact) return exact;

  // Fallbacks for nested paths
  if (pathname.startsWith('/capture')) return stepsByPath['/capture'];
  if (pathname.startsWith('/history')) return stepsByPath['/history'];
  if (pathname.startsWith('/machines')) return stepsByPath['/machines'];
  if (pathname.startsWith('/users')) return isAdmin ? stepsByPath['/users'] : stepsByPath['/'];
  if (pathname.startsWith('/import-readings')) return isAdmin ? stepsByPath['/import-readings'] : stepsByPath['/'];
  if (pathname.startsWith('/transaction-history')) return isAdmin ? stepsByPath['/transaction-history'] : stepsByPath['/'];
  if (pathname.startsWith('/meter-readings')) return stepsByPath['/meter-readings'];

  return stepsByPath['/'];
}

/**
 * Start the interactive tutorial for the current page.
 * Call this when user clicks "Help" or "Take a tour".
 */
export function startTutorial(pathname = window.location.pathname, isAdmin = false) {
  const steps = getStepsForPath(pathname, isAdmin);

  // Filter out steps whose elements don't exist
  const validSteps = steps.filter((step) => {
    const sel = typeof step.element === 'string' ? step.element : null;
    if (!sel) return true;
    return document.querySelector(sel);
  });

  if (validSteps.length === 0) {
    return;
  }

  const driverObj = driver({
    ...driverConfig,
    steps: validSteps,
  });

  driverObj.drive();
}
