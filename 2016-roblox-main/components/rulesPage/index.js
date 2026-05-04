import React from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#fff',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '40px',
    borderBottom: '2px solid #333',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333',
  },
  content: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#555',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '15px 0',
  },
  listItem: {
    padding: '8px 0 8px 25px',
    position: 'relative',
    '&:before': {
      content: '"•"',
      position: 'absolute',
      left: 0,
      fontWeight: 'bold',
    },
  },
  footer: {
    marginTop: '60px',
    paddingTop: '20px',
    borderTop: '2px solid #eee',
    fontSize: '14px',
    color: '#999',
    textAlign: 'center',
  },
});

const RulesPage = () => {
  const classes = useStyles();

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <h1 className={classes.title}>Game Rules</h1>
        <p className={classes.subtitle}>Keep the game fun and fair for everyone</p>
      </div>

      <div className={classes.section}>
        <h2 className={classes.sectionTitle}>Basic Rules</h2>
        <ul className={classes.list}>
          <li className={classes.listItem}>No cheating - Don't use exploits, hacks, or glitches</li>
          <li className={classes.listItem}>No scamming - Be honest in trades</li>
          <li className={classes.listItem}>Be respectful - Treat other players with basic respect</li>
          <li className={classes.listItem}>Keep chat clean - No offensive language or spam</li>
          <li className={classes.listItem}>Secure your account - Don't share your password</li>
        </ul>
      </div>

      <div className={classes.section}>
        <h2 className={classes.sectionTitle}>What Not to Do</h2>
        <ul className={classes.list}>
          <li className={classes.listItem}>Don't exploit bugs (report them instead)</li>
          <li className={classes.listItem}>Don't scam or trick other players</li>
          <li className={classes.listItem}>Don't harass or bully anyone</li>
          <li className={classes.listItem}>Don't spam chat</li>
          <li className={classes.listItem}>Don't share personal info</li>
          <li className={classes.listItem}>Don't manipulate the economy</li>
        </ul>
      </div>

      <div className={classes.section}>
        <h2 className={classes.sectionTitle}>If You Find a Bug</h2>
        <p className={classes.content}>
          Report it to support with:
        </p>
        <ul className={classes.list}>
          <li className={classes.listItem}>What happened</li>
          <li className={classes.listItem}>How to reproduce it</li>
          <li className={classes.listItem}>Screenshots if possible</li>
        </ul>
      </div>

      <div className={classes.section}>
        <h2 className={classes.sectionTitle}>Consequences</h2>
        <ul className={classes.list}>
          <li className={classes.listItem}>First offense: Warning</li>
          <li className={classes.listItem}>Repeated violations: Temporary ban</li>
          <li className={classes.listItem}>Serious stuff (cheating, scamming): Permanent ban</li>
        </ul>
      </div>

      <div className={classes.section}>
        <h2 className={classes.sectionTitle}>Questions?</h2>
        <p className={classes.content}>
          Ask in Discord #support or contact support@economysimulator.com
        </p>
      </div>

      <div className={classes.footer}>
        <p>That's it. Have fun and play fair.</p>
      </div>
    </div>
  );
};

export default RulesPage;
