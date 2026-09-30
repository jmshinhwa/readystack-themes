"""Invoice viewer - desktop build shipped to customers as a closed-source installer."""
import sys

from PyQt5 import QtCore, QtWidgets, uic


class InvoiceWindow(QtWidgets.QMainWindow):
    saved = QtCore.pyqtSignal(str)

    def __init__(self):
        super().__init__()
        uic.loadUi("invoice.ui", self)
        self.number_rule = QtCore.QRegExp(r"INV-\d{6}")

    @QtCore.pyqtSlot()
    def on_save(self):
        self.saved.emit("INV-000142")


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    window = InvoiceWindow()
    window.show()
    sys.exit(app.exec_())
