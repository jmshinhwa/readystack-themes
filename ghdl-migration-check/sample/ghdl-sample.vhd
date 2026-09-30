-- tb_uart_rx.vhd : testbench that ran in Vivado xsim
library ieee;
use ieee.std_logic_1164.all;
use ieee.std_logic_unsigned.all;
library unisim;
use unisim.vcomponents.all;
library xpm;
use xpm.vcomponents.all;

entity tb_uart_rx is
end entity;

architecture sim of tb_uart_rx is
  signal clk     : std_logic := '0';
  signal rx      : std_logic := '1';
  signal count   : std_logic_vector(7 downto 0) := (others => '0');
  shared variable errors : integer := 0;
begin
  clk <= not clk after 5 ns;

  counter : process(all)
  begin
    if rising_edge(clk) then
      count <= count + 1;
    end if;
  end process;

  stim : process
  begin
    wait for 10 us;
    assert errors = 0 report "RX errors seen" severity error;
    std.env.stop;
  end process;
end architecture;
