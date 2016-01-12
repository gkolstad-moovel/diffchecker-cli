import GoogleAnalytics from 'ga';

export default new GoogleAnalytics(process.env.GA_ID, process.env.GA_DOMAIN);
