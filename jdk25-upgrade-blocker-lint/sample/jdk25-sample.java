package com.acme.billing;

import java.applet.Applet;
import java.net.URL;
import java.util.Locale;
import java.security.AccessController;
import java.security.PrivilegedAction;
import javax.security.auth.Subject;
import javax.persistence.Entity;
import javax.servlet.http.HttpServletRequest;
import javax.xml.bind.JAXBContext;
import sun.misc.Unsafe;
import com.sun.crypto.provider.SunJCE;

@Entity
public class InvoiceExporter {

    private final Locale locale = new Locale("de", "DE");
    private final Integer retries = new Integer(3);
    private Thread workerThread;

    public void bootstrap(String policyPath) throws Exception {
        System.setProperty("java.security.policy", policyPath);
        System.setSecurityManager(new SecurityManager());
        java.security.Policy.getPolicy().refresh();
        System.loadLibrary("acme_pdf");
    }

    public String render(HttpServletRequest request) throws Exception {
        String endpoint = request.getParameter("endpoint");
        URL target = new URL(endpoint);
        JAXBContext ctx = JAXBContext.newInstance(Invoice.class);
        Object handler = Class.forName("com.acme.billing.PdfHandler").newInstance();
        handler.getClass().getDeclaredField("timeout").setAccessible(true);
        return AccessController.doPrivileged((PrivilegedAction<String>) () -> target.toString());
    }

    public String runAs(Subject subject) throws Exception {
        return Subject.doAs(subject, (PrivilegedAction<String>) () -> "ok");
    }

    public void shutdown() {
        workerThread.stop();
        System.runFinalization();
    }

    private long address() {
        Unsafe unsafe = Unsafe.getUnsafe();
        return unsafe.allocateMemory(64L);
    }

    private static native void writeHeader(long address);

    @Override
    protected void finalize() throws Throwable {
        closeTempFiles();
        super.finalize();
    }

    private void closeTempFiles() { }

    static class LegacyPreview extends Applet { }
}
