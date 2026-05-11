const User = require('../models/User');

exports.pushState = async (req, res) => {
    try {
        const { finance } = req.body;
        if (!finance) return res.status(400).json({ message: 'Finance state required' });

        // Handle Dev Mode
        if (req.user.id === 'dev_user_id') {
            return res.json({ success: true, message: 'Cloud sync simulated (Dev Mode)' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User find failed' });

        // Atomic update of finance fields
        user.monthlySalary = finance.monthlySalary;
        user.isSalarySet = finance.isSalarySet;
        user.currency = finance.currency;
        user.locale = finance.locale;
        user.transactions = finance.transactions;
        user.borrows = finance.borrows;
        user.notifications = finance.notifications;
        user.monthlyReports = finance.monthlyReports;

        await user.save();
        res.json({ success: true, message: 'Cloud sync complete' });
    } catch (err) {
        console.error('Sync Push Error:', err.message);
        res.status(500).json({ message: 'Server synchronization failed' });
    }
};

exports.pullState = async (req, res) => {
    try {
        // Handle Dev Mode
        if (req.user.id === 'dev_user_id') {
            return res.json({ finance: null }); // Let frontend use local fallback
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const finance = {
            monthlySalary: user.monthlySalary,
            isSalarySet: user.isSalarySet,
            currency: user.currency,
            locale: user.locale,
            transactions: user.transactions,
            borrows: user.borrows,
            notifications: user.notifications,
            monthlyReports: user.monthlyReports
        };

        res.json({ finance });
    } catch (err) {
        console.error('Sync Pull Error:', err.message);
        res.status(500).json({ message: 'Server retrieval failed' });
    }
};
