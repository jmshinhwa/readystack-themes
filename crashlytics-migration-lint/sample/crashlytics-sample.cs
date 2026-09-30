// MauiProgram / App.xaml.cs of a shipping .NET MAUI app, never migrated off App Center
using System;
using System.Collections.Generic;
using Microsoft.AppCenter;
using Microsoft.AppCenter.Analytics;
using Microsoft.AppCenter.Crashes;
using Microsoft.AppCenter.Distribute;

namespace FieldOps.Mobile
{
    public partial class App : Application
    {
        const string Secrets = "ios=3f2a9c1e-7b44-4d0e-9a51-0c6e2b7d8f10;android=9b1d4e27-2c83-4f6a-b0e5-7a3c9d1f2e64";

        protected override void OnStart()
        {
            AppCenter.LogLevel = LogLevel.Verbose;
            Crashes.ShouldAwaitUserConfirmation = () => true;
            Crashes.GetErrorAttachments = report => new[] { ErrorAttachmentLog.AttachmentWithText(Logs.Tail(), "log.txt") };
            AppCenter.Start(Secrets, typeof(Analytics), typeof(Crashes), typeof(Distribute));
            AppCenter.SetUserId(Session.TechnicianId);
            Distribute.CheckForUpdate();
        }

        async void OnConsent(bool granted)
        {
            Crashes.NotifyUserConfirmation(granted ? UserConfirmation.Send : UserConfirmation.DontSend);
            if (await Crashes.HasCrashedInLastSessionAsync()) ShowSorryBanner();
        }

        public static void Report(Exception ex, string jobId)
        {
            Crashes.TrackError(ex, new Dictionary<string, string> { { "job", jobId } });
            Analytics.TrackEvent("job_failed", new Dictionary<string, string> { { "job", jobId } });
        }

        void OnPrivacyToggle(bool on) => Crashes.SetEnabledAsync(on);
    }
}
