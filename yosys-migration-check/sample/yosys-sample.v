// top.v — board top ported from a Vivado 2025.2 project
`timescale 1ns / 1ps
module top (
    input  wire        sys_clk_p,
    input  wire        sys_clk_n,
    input  wire        rst_n,
    input  wire [7:0]  din,
    output wire [7:0]  dout
);
    wire clk, locked, sync_rst;

    clk_wiz_0 u_clk (.clk_in1_p(sys_clk_p), .clk_in1_n(sys_clk_n), .clk_out1(clk), .locked(locked));

    xpm_cdc_single #(.DEST_SYNC_FF(4)) u_rst_sync (.src_clk(1'b0), .src_in(~rst_n), .dest_clk(clk), .dest_out(sync_rst));

    (* mark_debug = "true" *) reg [7:0] pipe;

    xpm_memory_sdpram #(.MEMORY_SIZE(2048), .READ_DATA_WIDTH_B(8), .WRITE_DATA_WIDTH_A(8)) u_ram (
        .clka(clk), .clkb(clk), .ena(1'b1), .enb(1'b1), .wea(1'b1),
        .addra(pipe), .addrb(din), .dina(din), .doutb(dout)
    );

    always @(posedge clk) begin
        if (sync_rst) pipe <= 8'd0;
        else          pipe <= pipe + 8'd1;
    end

    ila_0 u_ila (.clk(clk), .probe0(pipe), .probe1(dout));

`pragma protect begin_protected
`pragma protect key_keyowner = "Xilinx", key_method = "rsa"
`pragma protect end_protected
endmodule
